import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_seller_approval_request(
  input?: DeepPartial<IMallPlatformSellerApprovalRequest.ICreate> | undefined,
): IMallPlatformSellerApprovalRequest.ICreate {
  input;
  return {};
}
