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

export async function test_api_guest_guests_list_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authorization (join) to get authorized connection for guest actors
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {} satisfies ICommunityPlatformGuest.IJoin,
  });
  // 2. Get guests list with default parameters (empty filter)
  const output: IPageICommunityPlatformGuest.ISummary =
    await api.functional.communityPlatform.guest.guests.patch(guestConnection, {
      body: {} satisfies ICommunityPlatformGuest.IRequest,
    });
  // 3. Runtime type validation
  typia.assert(output);
  // 4. Validate pagination structure integrity
  const pagination = output.pagination;
  TestValidator.predicate(
    "pagination current page greater or equal to 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit greater or equal to 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records greater or equal to 0",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages greater or equal to 0",
    pagination.pages >= 0,
  );
  // 5. Validate consistency between pagination fields
  TestValidator.predicate(
    "pagination pages equals ceil(records / limit) or 0 if limit is 0",
    pagination.pages ===
      (pagination.limit === 0
        ? 0
        : Math.ceil(pagination.records / pagination.limit)),
  );
  // 6. Validate data array presence
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  // 7. Ensure all guests are non-deleted (no deleted_at present or null) - according to summary, deleted_at may be present
  for (const guest of output.data) {
    // The guest is a summary object, which schema is empty {}, so no guaranteed properties exist, so no deleted_at property by schema.
    // So we just assert type of guest and presence
    typia.assert(guest); // This asserts guest matches ICommunityPlatformGuest.ISummary which is empty object type
  }
}
