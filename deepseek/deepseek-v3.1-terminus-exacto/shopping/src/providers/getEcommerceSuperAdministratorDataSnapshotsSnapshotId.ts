import { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceDataSnapshotTransformer } from "../transformers/EcommerceDataSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorDataSnapshotsSnapshotId(props: {
  superAdministrator: SuperadministratorPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceDataSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_data_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceDataSnapshotTransformer.select(),
    });
  return await EcommerceDataSnapshotTransformer.transform(snapshot);
}
