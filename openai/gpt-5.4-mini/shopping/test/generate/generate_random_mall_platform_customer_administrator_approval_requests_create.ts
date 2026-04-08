import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_administrator_approval_request } from "../prepare/prepare_random_mall_platform_administrator_approval_request";

/**
 * Generate a random mall platform administrator approval request via the API for E2E testing.
 *
 * Prepares administrator approval request creation data using the prepare function, then submits it through the mall platform customer administrator approval request creation endpoint.
 * The generated request preserves any caller-provided deep partial fields and returns the created approval request record from the API.
 *
 * @param connection - API connection information.
 * @param props - Optional deep partial creation input for customizing the prepared request body.
 * @returns The administrator approval request created by the API.
 */
export async function generate_random_mall_platform_customer_administrator_approval_requests_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMallPlatformAdministratorApprovalRequest.ICreate>
      | undefined;
  },
): Promise<IMallPlatformAdministratorApprovalRequest> {
  const prepared: IMallPlatformAdministratorApprovalRequest.ICreate =
    prepare_random_mall_platform_administrator_approval_request(props.body);
  return await api.functional.mallPlatform.customer.administratorApprovalRequests.create(
    connection,
    {
      body: prepared,
    },
  );
}
