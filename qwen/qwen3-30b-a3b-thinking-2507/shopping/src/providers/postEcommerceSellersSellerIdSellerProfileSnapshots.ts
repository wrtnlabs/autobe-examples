import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSellerProfileSnapshotCollector } from "../collectors/EcommerceSellerProfileSnapshotCollector";
import { EcommerceSellerProfileSnapshotTransformer } from "../transformers/EcommerceSellerProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSellersSellerIdSellerProfileSnapshots(props: {
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceSellerProfileSnapshot.ICreate;
}): Promise<IEcommerceSellerProfileSnapshot> {
  const seller = await MyGlobal.prisma.ecommerce_sellers.findUnique({
    where: { id: props.sellerId },
  });
  if (!seller) throw new HttpException("Seller not found", 404);
  const data = await EcommerceSellerProfileSnapshotCollector.collect({
    body: props.body,
    ecommerceSellers: seller,
  });
  const created =
    await MyGlobal.prisma.ecommerce_seller_profile_snapshots.create({
      data: data,
      ...EcommerceSellerProfileSnapshotTransformer.select(),
    });
  return await EcommerceSellerProfileSnapshotTransformer.transform(created);
}
