import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPromotion";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_promotions_search_active_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for member authentication and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Step 2: Update the connection with authentication token
  // The authorize_member_join function automatically updates memberConnection.headers with Authorization
  // Step 3: Define search criteria for active promotions with code 'SUMMER2024'
  const searchCriteria: ICommunityPlatformPromotion.IRequest = {
    page: 1,
    limit: 10,
    code: "SUMMER2024",
    status: "active",
  } satisfies ICommunityPlatformPromotion.IRequest;
  // Step 4: Perform the search using the member's authenticated connection
  const result: IPageICommunityPlatformPromotion.ISummary =
    await api.functional.communityPlatform.promotions.index(memberConnection, {
      body: searchCriteria,
    });
  // Step 5: Validate the response structure and content
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 10);
  // Validate that data array is not empty and contains promotions with correct code and status
  TestValidator.predicate("data array is not empty", result.data.length > 0);
  // Verify all returned promotions have code 'SUMMER2024' and active status
  for (const promotion of result.data) {
    TestValidator.equals(
      "promotion code matches criteria",
      promotion.code,
      "SUMMER2024",
    );
    TestValidator.equals("promotion status is active", promotion.active, true);
  }
}
