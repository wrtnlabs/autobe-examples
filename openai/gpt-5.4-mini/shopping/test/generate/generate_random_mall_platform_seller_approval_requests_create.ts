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
 * Prepares administrator approval request creation data using the matching prepare function,
 * then submits it to the platform approval request creation endpoint.
 *
 * @param connection - API connection object used to call the backend.
 * @param props - Optional creation payload overrides for the request body.
 * @returns The created administrator approval request record.
 */
export async function generate_random_mall_platform_seller_approval_requests_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMallPlatformAdministratorApprovalRequest.ICreate>
      | undefined;
  },
): Promise<IMallPlatformAdministratorApprovalRequest> {
  const prepared: IMallPlatformAdministratorApprovalRequest.ICreate =
    prepare_random_mall_platform_administrator_approval_request(props.body);
  const result: IMallPlatformAdministratorApprovalRequest =
    await api.functional.mallPlatform.seller.approvalRequests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
