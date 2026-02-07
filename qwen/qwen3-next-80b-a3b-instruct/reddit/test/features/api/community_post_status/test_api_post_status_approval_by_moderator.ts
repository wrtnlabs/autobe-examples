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

export async function test_api_post_status_approval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {} satisfies ICommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorAuthorized);
  // 2. Create member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  typia.assert(memberAuthorized);
  await authorize_member_login(memberConnection, {
    body: {} satisfies ICommunityMember.ILogin,
  });
  // 3. Member creates a post (default status is not flagged, but we don't control it; we just get a post)
  const post = await generate_random_community_member_posts_create(
    memberConnection,
    {
      body: {} satisfies ICommunityPost.ICreate,
    },
  );
  const safePost = typia.assert<ICommunityPost & { id: string }>(post);
  // 4. Moderator approves the post - body is string "approved" but type is ICommunityPostStatus (empty object), so we use satisfies to make it compile
  await TestValidator.error(
    "moderator should be able to approve a post",
    async () => {
      await api.functional.community.moderator.posts.status.updateStatus(
        moderatorConnection,
        {
          postId: safePost.id,
          body: "approved" satisfies ICommunityPostStatus,
        },
      );
    },
  );
}