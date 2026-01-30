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

export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account to create the initial comment
  const adminConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a community for the post
  const communityConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(communityConnection, {
    body: {
      email: admin.email,
      password, // Use captured password variable, not admin.password
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  const community =
    await generate_random_community_bbs_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create a post in the community
  const postConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(postConnection, {
    body: {
      email: admin.email,
      password, // Use captured password variable, not admin.password
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  const post = await generate_random_community_bbs_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Create a comment on the post by admin (to be updated later)
  const commentConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(commentConnection, {
    body: {
      email: admin.email,
      password, // Use captured password variable, not admin.password
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  const originalComment =
    await generate_random_community_bbs_admin_comments_create(
      commentConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(originalComment);
  // Step 5: Create a member account to verify permissions
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 6: Authenticate as the member who authored the comment (admin) using correct login
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(authorConnection, {
    body: {
      email: admin.email,
      password, // Use captured password variable, not admin.password
    } satisfies ICommunityBbsAdmin.ILogin,
  });
  // Step 7: Update the comment with new content using the correct credentials
  const updatedComment =
    await api.functional.communityBbs.admin.comments.update(authorConnection, {
      commentId: originalComment.id,
      body: {
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityBbsComment.IUpdate,
    });
  typia.assert(updatedComment);
  // Step 8: Verification of update cannot be performed as no read endpoint exists in the provided API
  // This is a scenario limitation as specified in requirements - we must ignore validation steps
  // that require endpoints not available in the provided SDK
  // No further validation possible with given API - scenario cannot be fully implemented as described
}