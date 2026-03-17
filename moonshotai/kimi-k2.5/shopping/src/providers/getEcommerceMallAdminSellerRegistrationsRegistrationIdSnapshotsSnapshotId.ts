import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerRegistrationSnapshotTransformer } from "../transformers/EcommerceMallSellerRegistrationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminSellerRegistrationsRegistrationIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  registrationId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSellerRegistrationSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_seller_registration_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceMallSellerRegistrationSnapshotTransformer.select(),
      },
    );
  // Verify the snapshot belongs to the specified registration
  if (snapshot.registration.id !== props.registrationId) {
    throw new HttpException("Snapshot not found for this registration", 404);
  }
  return await EcommerceMallSellerRegistrationSnapshotTransformer.transform(
    snapshot,
  );
}
