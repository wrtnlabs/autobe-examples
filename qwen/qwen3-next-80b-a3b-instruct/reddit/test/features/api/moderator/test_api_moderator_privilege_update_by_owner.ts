import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_privilege_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connections for moderator and owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as owner moderator
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  const ownerCreds = {
    email: ownerEmail,
    password: ownerPassword,
  } satisfies ICommunityPlatformModerator.IJoin;
  const ownerModerator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(ownerConnection, { body: ownerCreds });
  // Step 3: Create target moderator to be updated
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetPassword = RandomGenerator.alphaNumeric(16);
  const targetCreds = {
    email: targetEmail,
    password: targetPassword,
  } satisfies ICommunityPlatformModerator.IJoin;
  const targetModerator: ICommunityPlatformModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, { body: targetCreds });
  // Step 4: Update target moderator's privileges (suspended status and permissions)
  const updateData = {
    status: "suspended",
    permissions: {
      can_delete_posts: true,
      can_delete_comments: true,
      can_ban_users: true,
    },
  } satisfies ICommunityPlatformModerator.IUpdate;
  // Call update and store the response (returns ICommunityPlatformModerator)
  const updatedModerator: ICommunityPlatformModerator =
    await api.functional.communityPlatform.moderator.moderators.update(
      ownerConnection,
      {
        moderatorId: targetModerator.id,
        body: updateData,
      },
    );
  // Step 5: Validate the updated moderator record
  typia.assert(updatedModerator);
  // Step 6: Validate the only property that exists on ICommunityPlatformModerator: id
  TestValidator.equals(
    "updated moderator id matches target moderator id",
    updatedModerator.id,
    targetModerator.id,
  );
  // Note: We cannot validate status or permissions because they don't exist on ICommunityPlatformModerator
  // We cannot validate user or community properties because ISummary is defined as an empty object {}
  // The only valid validation is ensuring the update succeeded and returned a moderator object with the same id
}
