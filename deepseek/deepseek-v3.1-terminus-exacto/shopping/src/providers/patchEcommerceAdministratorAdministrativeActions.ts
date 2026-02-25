import { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMetadataRegistryRelationshipAtSummaryTransformer } from "../transformers/EcommerceMetadataRegistryRelationshipAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorAdministrativeActions(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMetadataRegistryRelationship.IRequest;
}): Promise<IPageIEcommerceMetadataRegistryRelationship.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search && {
      OR: [
        { action_type: { contains: props.body.search, mode: "insensitive" } },
        {
          general_description: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
        {
          administrator: {
            email: { contains: props.body.search, mode: "insensitive" },
          },
        },
        {
          superAdministrator: {
            email: { contains: props.body.search, mode: "insensitive" },
          },
        },
      ],
    }),
    ...(props.body.createdAt_from && {
      created_at: {
        ...(props.body.createdAt_from && {
          gte: new Date(props.body.createdAt_from),
        }),
        ...(props.body.createdAt_to && {
          lte: new Date(props.body.createdAt_to),
        }),
      },
    }),
  } satisfies Prisma.ecommerce_administrative_actionsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_administrative_actions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMetadataRegistryRelationshipAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_administrative_actions.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMetadataRegistryRelationshipAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
