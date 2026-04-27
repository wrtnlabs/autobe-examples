import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_images_create } from "../../../generate/generate_random_community_platform_member_communities_images_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_community_icon_upload_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  TestValidator.predicate(
    "community has initial icon",
    () => community.icon !== null && community.icon !== undefined,
  );
  typia.assertGuard(community.icon!);
  // 3. Register Member B (future moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member A appoints Member B as moderator
  const moderator =
    await generate_random_community_platform_member_moderators_create(
      memberAConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: memberB.username,
        },
      },
    );
  typia.assert(moderator);
  TestValidator.equals("moderator role", moderator.role, "moderator");
  // 5. Member B uploads a new icon image
  const oldIconId = community.icon!.id;
  const newIcon =
    await generate_random_community_platform_member_communities_images_create(
      memberBConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(newIcon);
  // 6. Validations
  TestValidator.predicate(
    "new icon has null deleted_at (is active)",
    () => newIcon.deleted_at === null,
  );
  TestValidator.notEquals(
    "new icon ID differs from old icon ID",
    newIcon.id,
    oldIconId,
  );
  TestValidator.equals(
    "new icon references the correct community",
    newIcon.community.id,
    community.id,
  );
}
