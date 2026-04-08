import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEcommerceMallSellerRegistrationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistrationSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallSellerRegistrationSnapshotTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerRegistrationsRegistrationIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  registrationId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerRegistrationSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findFirst(
      {
        where: {
          id: props.snapshotId,
          ecommerce_mall_seller_registration_id: props.registrationId,
        },
        ...EcommerceMallSellerRegistrationSnapshotTransformer.select(),
      },
    );
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  const registration =
    await MyGlobal.prisma.ecommerce_mall_seller_registrations.findUniqueOrThrow(
      {
        where: { id: props.registrationId },
        select: { seller_id: true },
      },
    );
  if (registration.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallSellerRegistrationSnapshotTransformer.transform(
    snapshot,
  );
}
