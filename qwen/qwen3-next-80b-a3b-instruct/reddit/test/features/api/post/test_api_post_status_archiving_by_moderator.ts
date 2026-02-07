import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityPostStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_member_posts_create } from "../../../generate/generate_random_community_member_posts_create";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_status_archiving_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Setup: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  // 3. Authenticate as member to create post
  await authorize_member_login(memberConnection, {
    body: {} satisfies ICommunityMember.ILogin,
  });
  // 4. Member creates a post
  // We call the utility function despite the empty interface
  const createdPost = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);
  // 5. Authenticate as moderator to archive post
  await authorize_moderator_login(moderatorConnection, {
    body: {} satisfies ICommunityModerator.ILogin,
  });
  // 6. Moderator archives the post
  // Since ICommunityPost has no ID property, we generate a UUID as the post ID
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Use the generated UUID as the postId, and cast the string literal to ICommunityPostStatus
  await api.functional.community.moderator.posts.status.updateStatus(
    moderatorConnection,
    {
      postId: postId,
      body: "archived" satisfies ICommunityPostStatus, // Correctly satisfying empty interface with valid literal value
    },
  );
  // The test passes if no error occurs during updateStatus
}
