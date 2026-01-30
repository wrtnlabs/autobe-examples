import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_admin_comments_create } from "../../../generate/generate_random_community_bbs_admin_comments_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  // Step 2: Admin login to obtain authentication token
  const loginAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(loginAdminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Step 3: Create member connection and register new user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  // Step 4: Member login to obtain authentication token
  const loginMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginMemberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityBbsMember.ILogin,
  });
  // Step 5: Member creates a community
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      loginMemberConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  // Step 6: Member creates a post within the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(
      loginMemberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_id: community.id,
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  // Step 7: Member creates a comment on the post
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_admin_comments_create(
      loginMemberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 8: Member deletes their own comment
  // Using the provided API function: DELETE /communityBbs/admin/comments/{commentId}
  await api.functional.communityBbs.admin.comments.erase(
    loginMemberConnection,
    {
      commentId: comment.id,
    },
  );
}
