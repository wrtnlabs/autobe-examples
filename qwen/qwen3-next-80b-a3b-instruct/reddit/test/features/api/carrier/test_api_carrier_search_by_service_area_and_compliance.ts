import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCarrier";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCarrier";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_carrier_search_by_service_area_and_compliance(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to access carrier search functionality
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // Step 2: Define search criteria
  const searchCriteria: ICommunityPlatformCarrier.IRequest = {
    page: 1,
    limit: 20,
    sort_by: "compliance_rating",
    order: "desc",
    service_area: "North America",
    compliance_status: "compliant",
  };
  // Step 3: Perform carrier search with the defined criteria
  const result: IPageICommunityPlatformCarrier.ISummary =
    await api.functional.communityPlatform.carriers.index(memberConnection, {
      body: searchCriteria,
    });
  typia.assert(result);
  // Step 4: Validate response structure matches IPageICommunityPlatformCarrier.ISummary
  TestValidator.equals("pagination page matches", result.pagination.current, 1);
  TestValidator.equals("pagination limit matches", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is positive",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive",
    result.pagination.pages > 0,
  );
  // Step 5: Validate data array contains only compliant carriers from North America
  for (const carrier of result.data) {
    TestValidator.equals(
      "carrier service area is North America",
      carrier.service_area,
      "North America",
    );
    TestValidator.predicate(
      "carrier compliance rating is at least 4.0",
      carrier.compliance_rating >= 4.0,
    );
    TestValidator.predicate(
      "carrier compliance rating is valid",
      carrier.compliance_rating >= 0 && carrier.compliance_rating <= 5,
    );
  }
  // Step 6: Verify compliance_rating is sorted in descending order (highest first)
  for (let i = 0; i < result.data.length - 1; i++) {
    TestValidator.predicate(
      "carriers sorted by compliance_rating descending",
      result.data[i].compliance_rating >= result.data[i + 1].compliance_rating,
    );
  }
}
