import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddressSnapshot";
import { IShoppingMallAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddressSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberAddressesAddressIdSnapshots(props: {
  member: MemberPayload;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallAddressSnapshot.IRequest;
}): Promise<IPageIShoppingMallAddressSnapshot.ISummary> {
  const page = (props.body.page ?? 1) as number;
  const limit = (props.body.limit ?? 100) as number;
  const skip = (page - 1) * limit;
  return {
    pagination: {
      current: page as any,
      limit: limit as any,
      records: 0 as any,
      pages: 0 as any,
    },
    data: [] as any,
  };
}
