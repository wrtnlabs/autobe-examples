import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_moderation_logs_retrieval_no_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and is authorized
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {}, // ICommunityPlatformModerator.IJoin is empty as per DTO
    },
  );
  typia.assert(moderatorAuthorized);
  // Update moderatorConnection with authorization token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderatorAuthorized.token.access}`,
  };
  // 2. Compose empty filter body since ICommunityPlatformModerationLog.IRequest is empty type
  const filterBody: ICommunityPlatformModerationLog.IRequest = {};
  // 3. Call patch endpoint with filterBody
  const output =
    await api.functional.communityPlatform.moderator.moderation_logs.patch(
      moderatorConnection,
      { body: filterBody },
    );
  typia.assert(output);
  // 4. Assert that the data array is empty or not (assuming no mock data)
  // Since no filters possible, we can only check structure
  TestValidator.predicate("output has data array", Array.isArray(output.data));
  // 5. Assert pagination metadata presence
  TestValidator.predicate(
    "pagination current is number",
    typeof output.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination limit is number",
    typeof output.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination records is number",
    typeof output.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof output.pagination.pages === "number",
  );
}
