import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_seller_approval_request } from "../prepare/prepare_random_mall_platform_seller_approval_request";

export async function generate_random_mall_platform_seller_seller_approval_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformSellerApprovalRequest.ICreate> | undefined;
  },
): Promise<IMallPlatformSellerApprovalRequest> {
  const prepared: IMallPlatformSellerApprovalRequest.ICreate =
    prepare_random_mall_platform_seller_approval_request(props.body);
  return await api.functional.mallPlatform.seller.seller_approval_requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
