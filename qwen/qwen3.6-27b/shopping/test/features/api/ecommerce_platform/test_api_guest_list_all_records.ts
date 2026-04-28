import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest listing endpoint without filters to verify basic paginated results retrieval.
 *
 * Validates the complete guest listing flow including guest registration and paginated retrieval. Ensures that the listing endpoint correctly returns guest records with proper pagination metadata.
 *
 * Special attention is given to verifying that pagination metadata is accurate, including total record counts, current page position, page limits, and total page calculations.
 *
 * 1. Guest joins the platform using device fingerprint.
 * 2. Guest listing endpoint is called with no filters using default pagination.
 * 3. Validates response contains the created guest record and pagination metadata is correct.
 * 4. Tests subsequent page request to verify pagination navigation works across multiple pages.
 */
export async function test_api_guest_list_all_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest joins the platform
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
    },
  });
  typia.assert(guestAuthorized);
  const guestFingerprint = guestAuthorized.device_fingerprint;
  // 2. List guests with default pagination (no filters)
  const pageOneBody = {
    page: 1,
    limit: 10,
  } satisfies IEcommercePlatformGuest.IRequest;
  const pageOneResponse = await api.functional.ecommercePlatform.guests.index(
    guestConnection,
    { body: pageOneBody },
  );
  typia.assert(pageOneResponse);
  // 3. Validate page 1 response contains the created guest
  TestValidator.predicate(
    "page one contains at least one record",
    pageOneResponse.data.length > 0,
  );
  const foundGuest = pageOneResponse.data.find(
    (g) => g.device_fingerprint === guestFingerprint,
  );
  TestValidator.predicate(
    "created guest found in page one results",
    foundGuest !== undefined,
  );
  TestValidator.equals("guest ID matches", foundGuest!.id, guestAuthorized.id);
  // 4. Validate pagination metadata for page 1
  TestValidator.equals(
    "current page is 1",
    pageOneResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", pageOneResponse.pagination.limit, 10);
  TestValidator.predicate(
    "records count is at least 1",
    pageOneResponse.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages calculation is valid",
    pageOneResponse.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pages matches ceil(records/limit)",
    pageOneResponse.pagination.pages ===
      Math.ceil(
        pageOneResponse.pagination.records / pageOneResponse.pagination.limit,
      ),
  );
  // 5. Test page 2 request to verify pagination navigation
  const pageTwoBody = {
    page: 2,
    limit: 10,
  } satisfies IEcommercePlatformGuest.IRequest;
  const pageTwoResponse = await api.functional.ecommercePlatform.guests.index(
    guestConnection,
    { body: pageTwoBody },
  );
  typia.assert(pageTwoResponse);
  // 6. Validate page 2 pagination metadata
  TestValidator.equals(
    "page two current is 2",
    pageTwoResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "page two limit is 10",
    pageTwoResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page two records matches page one records",
    pageTwoResponse.pagination.records === pageOneResponse.pagination.records,
  );
}
