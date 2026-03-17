import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformGuestAtSummaryTransformer } from "../transformers/CommunityPlatformGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformGuests(props: {
  body: ICommunityPlatformGuest.IRequest;
}): Promise<IPageICommunityPlatformGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtFilter =
    props.body.created_at === undefined
      ? {}
      : {
          created_at: {
            gte: props.body.created_at,
            lte: props.body.created_at,
          },
        };
  const updatedAtFilter =
    props.body.updated_at === undefined
      ? {}
      : {
          updated_at: {
            gte: props.body.updated_at,
            lte: props.body.updated_at,
          },
        };
  const deletedAtFilter =
    props.body.deleted_at === undefined
      ? {}
      : props.body.deleted_at === null
        ? {
            deleted_at: null,
          }
        : {
            deleted_at: {
              gte: props.body.deleted_at,
              lte: props.body.deleted_at,
            },
          };
  const whereInput = {
    ...(props.body.guest_key !== undefined && {
      guest_key: {
        contains: props.body.guest_key,
      },
    }),
    ...createdAtFilter,
    ...updatedAtFilter,
    ...deletedAtFilter,
  } satisfies Prisma.community_platform_guestsWhereInput;
  const orderByInput: Prisma.community_platform_guestsOrderByWithRelationInput[] =
    props.body.sort === "guest_key_asc"
      ? [{ guest_key: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
      : props.body.sort === "guest_key_desc"
        ? [{ guest_key: Prisma.SortOrder.desc }, { id: Prisma.SortOrder.desc }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: Prisma.SortOrder.asc }, { id: Prisma.SortOrder.asc }]
          : props.body.sort === "created_at_desc"
            ? [
                { created_at: Prisma.SortOrder.desc },
                { id: Prisma.SortOrder.desc },
              ]
            : props.body.sort === "updated_at_asc"
              ? [
                  { updated_at: Prisma.SortOrder.asc },
                  { id: Prisma.SortOrder.asc },
                ]
              : props.body.sort === "updated_at_desc"
                ? [
                    { updated_at: Prisma.SortOrder.desc },
                    { id: Prisma.SortOrder.desc },
                  ]
                : props.body.sort === "deleted_at_asc"
                  ? [
                      { deleted_at: Prisma.SortOrder.asc },
                      { id: Prisma.SortOrder.asc },
                    ]
                  : props.body.sort === "deleted_at_desc"
                    ? [
                        { deleted_at: Prisma.SortOrder.desc },
                        { id: Prisma.SortOrder.desc },
                      ]
                    : [
                        { created_at: Prisma.SortOrder.desc },
                        { id: Prisma.SortOrder.desc },
                      ];
  const data = await MyGlobal.prisma.community_platform_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformGuestAtSummaryTransformer.select(),
  });
  const records = await MyGlobal.prisma.community_platform_guests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformGuestAtSummaryTransformer.transform,
    ),
  };
}
