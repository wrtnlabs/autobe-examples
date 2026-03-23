import { IEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSystemConfiguration";
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

export async function patchEcommerceMallAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IEcommerceMallSystemConfiguration.IRequest;
}): Promise<IPageIEcommerceMallSystemConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_system_configurationsWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    where.OR = [
      { key: { contains: props.body.search } },
      { description: { contains: props.body.search } },
    ];
  }
  const orderBy: Prisma.ecommerce_mall_system_configurationsOrderByWithRelationInput =
    props.body.sort === "newest"
      ? { created_at: "desc" }
      : props.body.sort === "key_asc"
        ? { key: "asc" }
        : props.body.sort === "key_desc"
          ? { key: "desc" }
          : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_system_configurations.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        key: true,
        description: true,
      },
    }),
    MyGlobal.prisma.ecommerce_mall_system_configurations.count({ where }),
  ]);
  return {
    data: data.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      key: record.key,
      description: record.description === null ? undefined : record.description,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
