import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryMovements";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_movement_trends_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to establish inventory viewing permissions
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Call the trends analysis endpoint with default parameters (no filters)
  // The endpoint is PATCH /communityPlatform/member/inventory/movements/trends
  // According to API definition, this requires a body of type ICommunityPlatformInventoryMovements.IRequest
  // According to the ICommunityPlatformInventoryMovements.IRequest interface:
  // - page: Default<1> - optional with default of 1
  // - limit: Default<25> - optional with default of 25
  // - All other fields are optional with no defaults
  //
  // To ensure API compliance and avoid potential default value handling issues,
  // we explicitly include the default values for page and limit even though they are optional.
  // This follows the principle of explicitness for API calls.
  const response: IPageICommunityPlatformInventoryMovements =
    await api.functional.communityPlatform.member.inventory.movements.trends.index(
      memberConnection,
      {
        body: {
          page: 1, // Explicitly include default value
          limit: 25, // Explicitly include default value
        } satisfies ICommunityPlatformInventoryMovements.IRequest,
      },
    );
  // Step 3: Validate response structure and content
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals("pagination structure exists", response.pagination, {
    current: 1,
    limit: 25,
    records: response.pagination.records, // exact value will be determined by test data
    pages: Math.ceil(response.pagination.records / 25),
  });
  // Validate data array exists and contains ICommunityPlatformInventoryMovements objects
  TestValidator.predicate("data array is not empty", response.data.length > 0);
  // Validate each item in data array has correct structure
  // Per the ICommunityPlatformInventoryMovements DTO definition, only 'ratio' property exists
  response.data.forEach((item) => {
    TestValidator.predicate(
      "ratio is a number and >= 0",
      typeof item.ratio === "number" && item.ratio >= 0,
    );
  });
}
