import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSaleSnapshot";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_sale_snapshot_history_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformMember.IJoin;
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberData });
  typia.assert(member);
  // Step 2: Use a test sale code to retrieve snapshot history
  const saleCode = "test-sale-12345"; // Fixed sale code for consistent testing
  // Step 3: Retrieve the snapshot history for the sale
  // This is the only available API operation: returns IPageICommunityPlatformSaleSnapshot
  const snapshotHistory =
    await api.functional.communityPlatform.member.sales.snapshots.index(
      memberConnection,
      { saleCode },
    );
  typia.assert(snapshotHistory);
  // Step 4: Validate snapshot history structure and immutability
  TestValidator.predicate(
    "snapshot history contains at least one snapshot",
    snapshotHistory.data.length >= 0,
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    snapshotHistory.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    snapshotHistory.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshotHistory.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshotHistory.pagination.pages >= 0,
  );
  // Validate that each snapshot in history has the required properties
  for (const snapshot of snapshotHistory.data) {
    TestValidator.predicate(
      "snapshot has valid UUID id",
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid name",
      typeof snapshot.name === "string" &&
        snapshot.name.length >= 1 &&
        snapshot.name.length <= 100,
    );
    TestValidator.predicate(
      "snapshot has valid address_line_1",
      typeof snapshot.address_line_1 === "string" &&
        snapshot.address_line_1.length >= 1 &&
        snapshot.address_line_1.length <= 150,
    );
    TestValidator.predicate(
      "snapshot has valid city",
      typeof snapshot.city === "string" &&
        snapshot.city.length >= 1 &&
        snapshot.city.length <= 100,
    );
    TestValidator.predicate(
      "snapshot has valid state_province",
      typeof snapshot.state_province === "string" &&
        snapshot.state_province.length >= 1 &&
        snapshot.state_province.length <= 100,
    );
    TestValidator.predicate(
      "snapshot has valid postal_code",
      typeof snapshot.postal_code === "string" &&
        snapshot.postal_code.length >= 1 &&
        snapshot.postal_code.length <= 20,
    );
    TestValidator.predicate(
      "snapshot has valid country",
      typeof snapshot.country === "string" && snapshot.country.length === 2,
    );
    TestValidator.predicate(
      "snapshot has valid created_at",
      typeof snapshot.created_at === "string" &&
        !isNaN(Date.parse(snapshot.created_at)),
    );
    // Validate optional fields
    if (snapshot.address_line_2 !== undefined) {
      TestValidator.predicate(
        "snapshot has valid address_line_2",
        typeof snapshot.address_line_2 === "string" &&
          snapshot.address_line_2.length <= 150,
      );
    }
    if (snapshot.phone !== undefined) {
      TestValidator.predicate(
        "snapshot has valid phone",
        typeof snapshot.phone === "string" &&
          snapshot.phone.length >= 1 &&
          snapshot.phone.length <= 50,
      );
    }
    if (snapshot.is_business !== undefined) {
      TestValidator.predicate(
        "snapshot has valid is_business",
        typeof snapshot.is_business === "boolean",
      );
    }
    if (snapshot.is_preferred !== undefined) {
      TestValidator.predicate(
        "snapshot has valid is_preferred",
        typeof snapshot.is_preferred === "boolean",
      );
    }
    if (snapshot.notes !== undefined) {
      TestValidator.predicate(
        "snapshot has valid notes",
        typeof snapshot.notes === "string" && snapshot.notes.length <= 500,
      );
    }
    if (snapshot.latitude !== undefined) {
      TestValidator.predicate(
        "snapshot has valid latitude",
        typeof snapshot.latitude === "number" &&
          snapshot.latitude >= -90 &&
          snapshot.latitude <= 90,
      );
    }
    if (snapshot.longitude !== undefined) {
      TestValidator.predicate(
        "snapshot has valid longitude",
        typeof snapshot.longitude === "number" &&
          snapshot.longitude >= -180 &&
          snapshot.longitude <= 180,
      );
    }
    if (snapshot.time_zone !== undefined) {
      TestValidator.predicate(
        "snapshot has valid time_zone",
        typeof snapshot.time_zone === "string" &&
          snapshot.time_zone.length >= 3 &&
          snapshot.time_zone.length <= 50,
      );
    }
    if (snapshot.address_type !== undefined) {
      TestValidator.predicate(
        "snapshot has valid address_type",
        ["billing", "shipping", "both"].includes(snapshot.address_type),
      );
    }
  }
}
