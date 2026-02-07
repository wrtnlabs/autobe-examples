import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_administrators_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Search for administrators (the endpoint may apply default filtering)
  const response =
    await api.functional.discussionBoard.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(response);
  // Validate the response structure meets expectations
  TestValidator.predicate(
    "response contains pagination data",
    response.pagination !== undefined &&
      typeof response.pagination === "object",
  );
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );
  // Since the request body schema is empty {}, we validate the basic functionality
  // The filtering by active status would require specific request parameters
  // but based on the provided DTOs, the IRequest type is an empty object
  // This suggests the filtering might be handled through query parameters or
  // the endpoint applies its own default filtering logic
  // Validate that we received a valid paginated response
  TestValidator.equals(
    "pagination current page",
    response.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit",
    response.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages >= 0,
    true,
  );
  // If there are records, validate their basic structure
  if (response.data.length > 0) {
    const record = response.data[0];
    // typia.assert() already validated everything, so we just confirm
    // that we have data in the expected format
    TestValidator.predicate("first record exists", record !== undefined);
  }
  // Note: The actual active/inactive filtering functionality cannot be tested
  // with the current API schema since IDiscussionBoardAdministratorPromotionApproval.IRequest
  // is defined as an empty object with no filtering parameters.
  // This test validates the basic endpoint functionality instead.
}
