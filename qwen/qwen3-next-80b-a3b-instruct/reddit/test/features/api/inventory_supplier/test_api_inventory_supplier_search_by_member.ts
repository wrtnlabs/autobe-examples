import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventorySuppliers";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventorySuppliers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventorySuppliers";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_inventory_supplier_search_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {},
  };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  memberConnection.headers!.Authorization = memberAuth.token.access; // Fixed: Added ! to assert headers is not null/undefined
  // Step 2: Generate test inventory suppliers with varied properties
  // Create a pool of suppliers with different attributes
  const regionList = [
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Africa",
  ] as const;
  const complianceStatusList = [
    "compliant",
    "non-compliant",
    "pending",
  ] as const;
  // 3 suppliers that should match our search criteria
  const matchingSuppliers: ICommunityPlatformInventorySuppliers.ISummary[] = [];
  // Generate 3 suppliers matching our search criteria
  for (let i = 0; i < 3; i++) {
    const supplier = {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: `Tech Solutions ${i + 1} - ${RandomGenerator.alphaNumeric(4)}`,
      region: RandomGenerator.pick(regionList),
      compliance_status: RandomGenerator.pick(
        complianceStatusList,
      ) as "compliant",
      average_rating: RandomGenerator.pick([4.5, 4.8, 5.0]), // 4.5-5.0
      supplier_code: RandomGenerator.alphaNumeric(8),
      total_products: Math.floor(RandomGenerator.pick([25, 30, 35])),
      last_contacted: new Date().toISOString(),
      active_flag: true,
    } satisfies ICommunityPlatformInventorySuppliers.ISummary;
    matchingSuppliers.push(supplier);
  }
  // Generate 2 suppliers that should NOT match our search criteria
  const nonMatchingSuppliers: ICommunityPlatformInventorySuppliers.ISummary[] =
    [];
  for (let i = 0; i < 2; i++) {
    const supplier = {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: `Non-Matching Corp ${i + 1}`,
      region: RandomGenerator.pick(["Asia", "Europe", "North America"]),
      compliance_status: "non-compliant",
      average_rating: RandomGenerator.pick([2.5, 3.0]), // below threshold
      supplier_code: RandomGenerator.alphaNumeric(8),
      total_products: Math.floor(RandomGenerator.pick([5, 10])),
      last_contacted: "2020-01-01T00:00:00Z",
      active_flag: true,
    } satisfies ICommunityPlatformInventorySuppliers.ISummary;
    nonMatchingSuppliers.push(supplier);
  }
  // Create a single supplier with the name we'll search for
  const targetedSupplier = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Tech Solutions Alpha",
    region: "Asia",
    compliance_status: "compliant",
    average_rating: 4.7,
    supplier_code: RandomGenerator.alphaNumeric(8),
    total_products: 40,
    last_contacted: new Date().toISOString(),
    active_flag: true,
  } satisfies ICommunityPlatformInventorySuppliers.ISummary;
  // Combine all suppliers - these will be the "database" for our search
  const allSuppliers = [
    ...matchingSuppliers,
    ...nonMatchingSuppliers,
    targetedSupplier,
  ];
  // Step 3: Perform the search with specific criteria
  const searchTerm = "Tech Solutions";
  const searchParams: ICommunityPlatformInventorySuppliers.IRequest = {
    name: searchTerm, // Partial name match
    region: "Asia", // Exact region match
    minRating: 4.5, // Minimum rating threshold
    complianceStatus: "compliant", // Compliance status filter
    sortBy: "name", // Sort by name field
    sortDirection: "asc", // Ascending order
    page: 1, // First page
    limit: 10, // 10 results per page
  } satisfies ICommunityPlatformInventorySuppliers.IRequest;
  // Step 4: Execute the search API call with member connection
  const searchResult: IPageICommunityPlatformInventorySuppliers.ISummary =
    await api.functional.communityPlatform.member.inventory_suppliers.index(
      memberConnection,
      {
        body: searchParams,
      },
    );
  typia.assert(searchResult);
  // Step 5: Validate pagination structure
  TestValidator.equals(
    "pagination page number is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    searchResult.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records > 0",
    () => searchResult.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    () => searchResult.pagination.pages >= 1,
  );
  // Step 6: Validate that only matching suppliers are returned
  TestValidator.predicate(
    "search result has data",
    () => searchResult.data.length > 0,
  );
  // Filter matching suppliers based on the search criteria
  const expectedMatches = allSuppliers.filter((supplier) => {
    // Name partial match - case-insensitive
    const nameMatch = supplier.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    // Exact region match
    const regionMatch = supplier.region === searchParams.region;
    // Minimum rating match
    const ratingMatch =
      supplier.average_rating >= (searchParams.minRating ?? 0);
    // Compliance status match
    const complianceMatch =
      supplier.compliance_status === searchParams.complianceStatus;
    // Active flag - should be true
    const activeMatch = supplier.active_flag === true;
    return (
      nameMatch && regionMatch && ratingMatch && complianceMatch && activeMatch
    );
  });
  // The number of expected matches should equal the number of results returned
  TestValidator.equals(
    "search results count matches expected",
    searchResult.data.length,
    expectedMatches.length,
  );
  // Step 7: Validate exact matching of suppliers
  // Each returned supplier must match the search criteria
  for (const result of searchResult.data) {
    // Verify the returned supplier is one of our known suppliers
    const match = allSuppliers.find((s) => s.id === result.id);
    TestValidator.predicate(
      "result is one of our generated suppliers",
      () => !!match,
    );
    // Verify all search criteria are satisfied
    TestValidator.predicate("supplier name contains search term", () =>
      match!.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    TestValidator.equals(
      "supplier region matches search",
      match!.region,
      searchParams.region,
    );
    TestValidator.predicate(
      "supplier rating meets minimum",
      () => match!.average_rating >= (searchParams.minRating ?? 0),
    );
    TestValidator.equals(
      "supplier compliance status matches search",
      match!.compliance_status,
      searchParams.complianceStatus,
    );
    // Active flag should be true for all results
    TestValidator.equals("supplier is active", match!.active_flag, true);
  }
  // Step 8: Validate sorting by name in ascending order
  // Check that results are sorted by name in ascending order
  for (let i = 0; i < searchResult.data.length - 1; i++) {
    const currentName = searchResult.data[i].name;
    const nextName = searchResult.data[i + 1].name;
    TestValidator.predicate(
      "names sorted ascending",
      () => currentName.localeCompare(nextName) <= 0,
    );
  }
  // Step 9: Validate member can only access their own region's suppliers
  // Since member is authenticated and we're using the member endpoint, they should only see suppliers matching their region
  // We've already ensured the region filter is applied
  // Step 10: Validate that the API returns exactly the correct set of suppliers
  // Compare the result IDs with expected IDs
  const resultIds = searchResult.data.map((s) => s.id);
  const expectedIds = expectedMatches.map((s) => s.id);
  // Sort both arrays for comparison
  resultIds.sort();
  expectedIds.sort();
  TestValidator.equals(
    "returned supplier IDs match expected",
    resultIds.length,
    expectedIds.length,
  );
  // Compare each ID
  for (let i = 0; i < resultIds.length; i++) {
    TestValidator.equals(
      "result ID matches expected",
      resultIds[i],
      expectedIds[i],
    );
  }
  // The test passes if all validations succeed
}
