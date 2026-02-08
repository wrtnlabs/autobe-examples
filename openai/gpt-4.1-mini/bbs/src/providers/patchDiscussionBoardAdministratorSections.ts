import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdministratorSections(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardSection.IRequest;
}): Promise<IPageIDiscussionBoardSection.ISummary> {
  // Safely handle page and limit as they do not exist on IRequest
  const page =
    (typeof (props.body as any).page === "number"
      ? (props.body as any).page
      : 1) ?? 1;
  const limit =
    (typeof (props.body as any).limit === "number"
      ? (props.body as any).limit
      : 100) ?? 100;
  const skip = (page - 1) * limit;
  const bodyAny = props.body as any;
  const where: Prisma.discussion_board_sectionsWhereInput = {
    deleted_at: null,
    ...(bodyAny.name ? { name: { contains: bodyAny.name } } : {}),
    ...(bodyAny.description
      ? { description: { contains: bodyAny.description } }
      : {}),
  };
  const sort = bodyAny.sort;
  const orderBy: Prisma.discussion_board_sectionsOrderByWithRelationInput =
    sort === "name_desc" ? { name: "desc" } : { name: "asc" };
  const data = await MyGlobal.prisma.discussion_board_sections.findMany({
    where,
    orderBy,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.discussion_board_sections.count({
    where,
  });
  const transformedData: IDiscussionBoardSection.ISummary[] = data.map((v) => {
    return {
      id: v.id,
      name: v.name,
      description: v.description === null ? undefined : v.description,
      created_at: toISOStringSafe(v.created_at),
      updated_at: toISOStringSafe(v.updated_at),
      deleted_at:
        v.deleted_at === null ? undefined : toISOStringSafe(v.deleted_at),
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
