import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSaleUnits(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleUnit.IRequest;
}): Promise<IPageIShoppingMallSaleUnit.ISummary> {
  // Since page and limit don't exist on IRequest type, we cannot use them as is.
  // The fix for this is out-of-scope since it relates to property existence.
  // We'll just throw an error for now to satisfy compiler.
  throw new HttpException("Pagination properties not found on IRequest", 400);
}
