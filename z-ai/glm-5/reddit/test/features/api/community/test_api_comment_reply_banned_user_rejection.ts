import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_replies_create_reply } from "../../../generate/generate_random_community_member_comments_replies_create_reply";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_reply_banned_user_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Member A (who will become community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA: ICommunityMember.IAuthorized = await authorize_member_join(
    memberAConnection,
    {},
  );
  typia.assert(memberA);
  // 2. Create a community (Member A becomes owner automatically)
  const community: ICommunityCommunity =
    await generate_random_community_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Create a post within the community
  const post: ICommunityPost =
    await generate_random_community_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "TEXT",
          text_content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(post);
  // 4. Create a parent comment on the post
  const comment: ICommunityComment =
    await generate_random_community_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 5. Authenticate as Member B (a different member who will be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB: ICommunityMember.IAuthorized = await authorize_member_join(
    memberBConnection,
    {},
  );
  typia.assert(memberB);
  // 6. Ban Member B from the community using Member A's (owner's) session
  const ban: ICommunityBan =
    await generate_random_community_member_communities_bans_create(
      memberAConnection,
      {
        params: { communityName: community.name },
        body: {
          username: memberB.username,
          reason: "Test ban for E2E testing",
        },
      },
    );
  typia.assert(ban);
  // 7. Verify the ban was created correctly
  TestValidator.equals(
    "banned member username",
    ban.member.username,
    memberB.username,
  );
  TestValidator.equals("community name", ban.community.name, community.name);
  // 8. Switch to Member B's context and attempt to create a reply to the comment
  // This should fail with HTTP 403 Forbidden
  await TestValidator.httpError(
    "banned user cannot reply to comments",
    403,
    async () =>
      await generate_random_community_member_comments_replies_create_reply(
        memberBConnection,
        {
          params: { commentId: comment.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      ),
  );
}
