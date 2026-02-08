import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_guest_list_success_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Use a new connection object with host only
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the public guest list endpoint without authorization
  const output: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guest.guests.get(guestConnection);
  // Assert the output matches the IPageICommunityPlatformGuest.ISummary type
  typia.assert(output);
  // Validate pagination metadata fields
  TestValidator.predicate(
    "pagination current is a positive number",
    output.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is a positive number",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is zero or positive",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is zero or positive",
    output.pagination.pages >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is array", Array.isArray(output.data));
}
