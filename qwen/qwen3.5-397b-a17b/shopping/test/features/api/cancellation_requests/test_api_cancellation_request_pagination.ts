import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test cancellation request listing pagination API contract and response structure.
 *
 * Validates the pagination endpoint for member cancellation requests including authentication, parameter acceptance, and response type validation. Tests that the API correctly handles pagination parameters (page, limit) and returns properly structured responses with pagination metadata.
 *
 * The test authenticates a member account, calls the cancellation requests list endpoint with various pagination configurations, and validates response structure using typia.assert. This ensures the pagination API contract is correctly implemented and type-safe.
 *
 * 1. Member registers and authenticates using authorize_member_join utility.
 * 2. Calls cancellation requests list with limit=5, page=1.
 * 3. Validates response contains pagination metadata (current, limit, records, pages) and data array.
 * 4. Calls with page=2, limit=10 to verify pagination parameters work correctly.
 * 5. Validates all responses conform to IPageIShoppingMallCancellationRequest.ISummary type.
 */
export async function test_api_cancellation_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Call cancellation requests list with page=1, limit=5
  const page1Response =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 5 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  // 3. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination exists",
    page1Response.pagination !== null,
  );
  TestValidator.equals("current page", page1Response.pagination.current, 1);
  TestValidator.equals("limit matches", page1Response.pagination.limit, 5);
  TestValidator.predicate(
    "records is non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    page1Response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(page1Response.data));
  // 4. Call with page=2, limit=10 to verify pagination parameters
  const page2Response =
    await api.functional.shoppingMall.member.cancellation_requests.index(
      memberConnection,
      {
        body: {
          page: 2 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  // 5. Validate second page response structure
  TestValidator.equals("current page", page2Response.pagination.current, 2);
  TestValidator.equals("limit matches", page2Response.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    page2Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    page2Response.pagination.pages >= 0,
  );
  TestValidator.predicate("data is array", Array.isArray(page2Response.data));
  // 6. Validate records count consistency across pages
  TestValidator.equals(
    "records count consistent",
    page1Response.pagination.records,
    page2Response.pagination.records,
  );
  // 7. Validate pages calculation is correct
  const expectedPages =
    page1Response.pagination.records === 0
      ? 0
      : (Math.ceil(
          page1Response.pagination.records / 5,
        ) satisfies number as number);
  TestValidator.equals(
    "pages calculation page1",
    page1Response.pagination.pages,
    expectedPages,
  );
  const expectedPages2 =
    page2Response.pagination.records === 0
      ? 0
      : (Math.ceil(
          page2Response.pagination.records / 10,
        ) satisfies number as number);
  TestValidator.equals(
    "pages calculation page2",
    page2Response.pagination.pages,
    expectedPages2,
  );
}
