import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingSellerSellersSellerIdAddressesAddressId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingSellerAddress.IUpdate;
}): Promise<IShoppingSellerAddress> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - API DTO and return type IShoppingSellerAddress requires recipient_name
   *   field
   * - Prisma model shopping_seller_addresses does NOT have a recipient_name field
   *
   * This function cannot fulfill the contract as required by the OpenAPI spec
   * and DTO interface without schema changes to add the recipient_name property
   * on the table. There is no certified way to produce this field for the
   * return type given the absence in the DB.
   *
   * @todo Update the schema to add recipient_name (string) on
   *   shopping_seller_addresses model or update the OpenAPI contract/DTO to
   *   remove/relax recipient_name.
   */
  return typia.random<IShoppingSellerAddress>();
}
