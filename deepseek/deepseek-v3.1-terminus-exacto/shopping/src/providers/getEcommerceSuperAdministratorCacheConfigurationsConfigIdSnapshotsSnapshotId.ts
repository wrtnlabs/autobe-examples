import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceCacheConfigurationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationSnapshot";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceCacheConfigurationSnapshotTransformer } from "../transformers/EcommerceCacheConfigurationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorCacheConfigurationsConfigIdSnapshotsSnapshotId(props: {
  superAdministrator: SuperadministratorPayload;
  configId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceCacheConfigurationSnapshot> {
  // First verify the cache configuration exists
  await MyGlobal.prisma.ecommerce_cache_configurations.findUniqueOrThrow({
    where: { id: props.configId },
  });
  // Retrieve the snapshot with transformer select
  const snapshot =
    await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...EcommerceCacheConfigurationSnapshotTransformer.select(),
      },
    );
  // Verify the snapshot belongs to the specified config
  // 直接从数据库查询快照及其配置ID
  const snapshotWithConfigId =
    await MyGlobal.prisma.ecommerce_cache_configuration_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: { ecommerce_cache_configuration_id: true },
      },
    );
  if (
    snapshotWithConfigId.ecommerce_cache_configuration_id !== props.configId
  ) {
    throw new HttpException(
      "Snapshot does not belong to the specified configuration",
      403,
    );
  }
  // Transform and return using the loaded transformer
  return await EcommerceCacheConfigurationSnapshotTransformer.transform(
    snapshot,
  );
}
