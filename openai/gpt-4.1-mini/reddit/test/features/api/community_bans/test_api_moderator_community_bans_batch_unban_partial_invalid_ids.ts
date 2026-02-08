import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_community_bans_batch_unban_partial_invalid_ids(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator account registration and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const modAuth = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<ICommunityPlatformModerator.IJoin>(),
  });
  typia.assert(modAuth);
  // Attach the authorization token to moderatorConnection
  moderatorConnection.headers = {
    Authorization: `Bearer ${modAuth.token.access}`,
  };
  // 2. Prepare ban IDs for unban batch request
  // We'll simulate one valid UUID for a valid ban ID
  // And add two invalid or non-existent ban IDs
  const validBanId = typia.random<string & tags.Format<"uuid">>();
  const invalidBanId1 = "00000000-0000-0000-0000-000000000000";
  const invalidBanId2 = "123e4567-e89b-12d3-a456-426614174000";
  // Compose request body as string array (assumed format due to missing body schema details)
  const requestBody = [validBanId, invalidBanId1, invalidBanId2];
  // 3. Perform batch unban with mixed valid and invalid IDs
  const response =
    await api.functional.communityPlatform.moderator.community_bans.batch.unban.batchUnban(
      moderatorConnection,
      { body: requestBody as any },
    );
  typia.assert(response);
  // 4. Validate response contains unbanned records with valid ID only
  // Response is paged summary, but ISummary has no defined properties
  // We will assume existence of 'id' to check returned ban IDs
  const returnedBanIds = response.data
    .map((ban) => (ban as any).id as string | undefined)
    .filter((id) => id !== undefined) as string[];
  TestValidator.predicate(
    "valid ban ID is unbanned",
    returnedBanIds.includes(validBanId),
  );
  TestValidator.predicate(
    "invalid ban IDs are not unbanned",
    !returnedBanIds.includes(invalidBanId1) &&
      !returnedBanIds.includes(invalidBanId2),
  );
  // 5. Confirm authorization is enforced by calling without token
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access denied", async () => {
    await api.functional.communityPlatform.moderator.community_bans.batch.unban.batchUnban(
      unauthorizedConnection,
      { body: requestBody as any },
    );
  });
}
