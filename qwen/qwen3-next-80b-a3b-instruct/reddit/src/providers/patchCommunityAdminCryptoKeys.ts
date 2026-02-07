import { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCryptoKey";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityAdminCryptoKeys(props: {
  admin: AdminPayload;
  body: ICommunityCryptoKey.IRequest;
}): Promise<IPageICommunityCryptoKey.ISummary> {
  // Hardcoded defaults since IRequest is empty object {}
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_crypto_keys.findMany({
    where: {
      status: "active",
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    select: {
      id: true,
      key_type: true,
      algorithm: true,
      key_metadata: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_crypto_keys.count({
    where: {
      status: "active",
      deleted_at: null,
    },
  });
  return {
    data: data.map((item) => ({
      id: item.id as string & tags.Format<"uuid">,
      key_type: item.key_type,
      algorithm: item.algorithm,
      key_metadata: item.key_metadata,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(item.updated_at) as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
