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
 * Generate a random mall platform administrator approval request decision via the API for E2E testing.
 *
 * Prepares administrator approval request decision data using the prepare function, then calls the API to record a super-administrator decision for the specified approval request.
 *
 * @param connection - API connection object used to execute the request.
 * @param props - Optional body customization and required approval request identifier.
 * @returns The updated administrator approval request after the decision has been recorded.
 */
export async function generate_random_mall_platform_administrator_approval_requests_decisions_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMallPlatformAdministratorApprovalRequest.ICreate>
      | undefined;
    params: {
      approvalRequestId: string;
    };
  },
): Promise<IMallPlatformAdministratorApprovalRequest> {
  const prepared: IMallPlatformAdministratorApprovalRequest.ICreate =
    prepare_random_mall_platform_administrator_approval_request(props.body);
  return await api.functional.mallPlatform.administrator.approvalRequests.decisions.create(
    connection,
    {
      body: prepared,
      approvalRequestId: props.params.approvalRequestId,
    },
  );
}
