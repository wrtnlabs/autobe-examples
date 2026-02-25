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
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test that a banned user cannot create comments on posts in the community they are banned from.
 *
 * Steps:
 * 1. Register member A (who will be banned from commenting)
 * 2. Register member B (who will be community owner/moderator)
 * 3. Member B creates a community (becomes owner, auto-subscribed)
 * 4. Member B creates a post in the community
 * 5. Member B bans member A from the community
 * 6. Member A attempts to create a comment on the post
 *
 * Expected: API returns error (403 USER_BANNED_FROM_COMMUNITY), comment is not created
 */
export async function test_api_comment_creation_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create connections for member A and member B
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // 2. Register member A (the user who will be banned)
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      username: `banned_user_${RandomGenerator.alphaNumeric(6)}`,
    },
  });
  typia.assert(memberA);
  // 3. Register member B (the community owner)
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      username: `owner_user_${RandomGenerator.alphaNumeric(6)}`,
    },
  });
  typia.assert(memberB);
  // 4. Member B creates a community (becomes owner and is auto-subscribed)
  const community = await generate_random_community_member_communities_create(
    memberBConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 5. Member B creates a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberBConnection,
    {
      params: {
        communityName: community.name,
      },
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 6. Member B bans member A from the community
  const ban = await generate_random_community_member_communities_bans_create(
    memberBConnection,
    {
      params: {
        communityName: community.name,
      },
      body: {
        username: memberA.username,
        reason: "Test ban for e2e testing",
      },
    },
  );
  typia.assert(ban);
  // Verify ban details
  TestValidator.equals(
    "banned member username",
    ban.member.username,
    memberA.username,
  );
  TestValidator.equals("ban community", ban.community.name, community.name);
  // 7. Member A attempts to create a comment on the post
  // This should fail because member A is banned from the community
  await TestValidator.error("banned user cannot create comments", async () => {
    await generate_random_community_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  });
}
