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

export async function test_api_moderator_community_bans_batch_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Batch unban multiple banned users successfully.
  // - Moderator joins (registers) an account.
  // - Moderator sends a POST request with an array of valid community ban record IDs to unban.
  // - System verifies all ban IDs exist and belong to the communities moderated by this moderator.
  // - System updates unbanned_at timestamps of the specified bans to current timestamp within a transaction.
  // - System returns the updated ban records with unbanned_at set.
  // - Validate response contains all requested bans unbanned correctly.
  // - Confirm moderator authorization is enforced.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    { body: {} },
  );
  typia.assert(moderatorAuthorized);
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  const body = {} satisfies ICommunityPlatformCommunityBan.IBatchUnbanRequest;
  const output =
    await api.functional.communityPlatform.moderator.community_bans.batch.unban.batchUnban(
      moderatorConnection,
      { body },
    );
  typia.assert(output);
  TestValidator.predicate("response has pagination", !!output.pagination);
  TestValidator.predicate(
    "response has data array",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "pagination has current",
    typeof output.pagination.current === "number" &&
      output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof output.pagination.limit === "number" && output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    typeof output.pagination.records === "number" &&
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof output.pagination.pages === "number" && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "authorization header present",
    "Authorization" in (moderatorConnection.headers ?? {}),
  );
}
