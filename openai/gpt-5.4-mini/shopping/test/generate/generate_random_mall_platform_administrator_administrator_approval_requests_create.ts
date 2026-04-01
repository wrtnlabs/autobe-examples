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

export async function generate_random_mall_platform_administrator_administrator_approval_requests_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IMallPlatformAdministratorApprovalRequest.ICreate>
      | undefined;
  },
): Promise<IMallPlatformAdministratorApprovalRequest> {
  const prepared: IMallPlatformAdministratorApprovalRequest.ICreate =
    prepare_random_mall_platform_administrator_approval_request(props.body);
  return await api.functional.mallPlatform.administrator.administratorApprovalRequests.create(
    connection,
    {
      body: prepared,
    },
  );
}
