import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequestOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

// Type for accessing pagination with expected properties
interface IPaginationWithDetails {
  readonly current: number;
  readonly limit: number;
  readonly records: number;
  readonly pages: number;
}

export async function test_api_admin_request_listing_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Get paginated list of admin requests with specific pagination
  const response =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(response);
  const pagination = response.pagination as unknown as IPaginationWithDetails;
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination metadata exists",
    response.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current is valid",
    typeof pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination limit is valid",
    typeof pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination records is valid",
    typeof pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination pages is valid",
    typeof pagination.pages === "number",
    true,
  );
  // 4. Validate pagination calculation
  if (pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      pagination.pages >= 1,
    );
    TestValidator.predicate(
      "current page is within bounds",
      pagination.current >= 1 &&
        pagination.current <= pagination.pages,
    );
  }
  // 5. Validate data array exists
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // 6. Validate request summary structure if data exists
  if (response.data.length > 0) {
    const firstRequest = response.data[0]!;
    TestValidator.equals(
      "request has id",
      firstRequest.id !== undefined && firstRequest.id !== null,
      true,
    );
    TestValidator.equals(
      "request has actorType",
      firstRequest.actorType !== undefined,
      true,
    );
    TestValidator.equals(
      "request has requestedGrade",
      firstRequest.requestedGrade !== undefined,
      true,
    );
    TestValidator.equals(
      "request has reason",
      firstRequest.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "request has status",
      firstRequest.status !== undefined,
      true,
    );
    TestValidator.equals(
      "request has createdAt",
      firstRequest.createdAt !== undefined,
      true,
    );
    // 7. Validate actorType is valid enum
    const validActorTypes = ["customer", "seller"] as const;
    TestValidator.predicate(
      "actorType is valid enum",
      validActorTypes.includes(firstRequest.actorType),
    );
    // 8. Validate requestedGrade is valid enum
    const validGrades = ["admin", "super_admin"] as const;
    TestValidator.predicate(
      "requestedGrade is valid enum",
      validGrades.includes(firstRequest.requestedGrade),
    );
    // 9. Validate status is valid enum
    const validStatuses = ["pending", "approved", "rejected"] as const;
    TestValidator.predicate(
      "status is valid enum",
      validStatuses.includes(firstRequest.status),
    );
    // 10. Validate sorting - requests should be sorted newest first (createdAt descending)
    if (response.data.length > 1) {
      for (let i = 0; i < response.data.length - 1; i++) {
        const currentCreatedAt = new Date(
          response.data[i]!.createdAt,
        ).getTime();
        const nextCreatedAt = new Date(
          response.data[i + 1]!.createdAt,
        ).getTime();
        TestValidator.predicate(
          `request ${i} is newer or equal to request ${i + 1}`,
          currentCreatedAt >= nextCreatedAt,
        );
      }
    }
  }
  // 11. Test with optional filters
  const filteredResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          status: "pending" as "pending" | "approved" | "rejected",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(filteredResponse);
  TestValidator.equals(
    "filtered response has pagination",
    filteredResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "filtered response has data array",
    Array.isArray(filteredResponse.data),
    true,
  );
  // 12. Test actorType filter
  const actorTypeFilteredResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          actorType: "customer" as "customer" | "seller",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(actorTypeFilteredResponse);
  TestValidator.equals(
    "actorType filter response has pagination",
    actorTypeFilteredResponse.pagination !== undefined,
    true,
  );
  // 13. Test requestedGrade filter
  const gradeFilteredResponse =
    await api.functional.ecommerceMall.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
          requestedGrade: "admin" as "admin" | "super_admin",
        } satisfies IEcommerceMallAdminRequestOfCustomer.IRequest,
      },
    );
  typia.assert(gradeFilteredResponse);
  TestValidator.equals(
    "grade filter response has pagination",
    gradeFilteredResponse.pagination !== undefined,
    true,
  );
}