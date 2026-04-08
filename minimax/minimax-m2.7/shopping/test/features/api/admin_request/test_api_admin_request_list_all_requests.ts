import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_request_list_all_requests(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. List all admin requests without any filters
  const response =
    await api.functional.ecommerceMall.superAdmin.admin.admin_requests.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallAdminRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination object exists",
    response.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination has current page",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // 5. If there are admin requests, validate their structure
  for (const request of response.data) {
    TestValidator.equals(
      "actorType is valid",
      request.actorType === "customer" || request.actorType === "seller",
      true,
    );
    TestValidator.equals(
      "requestedGrade is valid",
      request.requestedGrade === "admin" ||
        request.requestedGrade === "super_admin",
      true,
    );
    TestValidator.equals(
      "status is valid",
      request.status === "pending" ||
        request.status === "approved" ||
        request.status === "rejected",
      true,
    );
    // Validate actor exists and has correct type based on actorType
    if (request.actorType === "customer") {
      TestValidator.equals(
        "customer actor has id",
        request.actor?.id !== undefined,
        true,
      );
      TestValidator.equals(
        "customer actor has email",
        request.actor?.email !== undefined,
        true,
      );
    } else if (request.actorType === "seller") {
      TestValidator.equals(
        "seller actor has id",
        request.actor?.id !== undefined,
        true,
      );
      TestValidator.equals(
        "seller actor has email",
        request.actor?.email !== undefined,
        true,
      );
    }
    // Validate reviewer exists if request has been reviewed
    if (request.status === "approved" || request.status === "rejected") {
      TestValidator.equals(
        "reviewer exists",
        request.reviewer !== undefined,
        true,
      );
    }
  }
}
