import { IEconomicBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionSnapshot";
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

export async function patchEconomicBoardAdministratorSectionsSectionIdSnapshots(props: {
  administrator: AdministratorPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IEconomicBoardSectionSnapshot.IRequest;
}): Promise<IPageIEconomicBoardSectionSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_board_section_snapshots.findMany({
    where: { economic_board_section_id: props.sectionId },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      section_name: true,
      section_description: true,
      created_at: true,
      snapshot_reason: true,
      economic_board_administrator_id: true,
    },
  });
  const total = await MyGlobal.prisma.economic_board_section_snapshots.count({
    where: { economic_board_section_id: props.sectionId },
  });
  return {
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          section_name: snapshot.section_name,
          section_description: snapshot.section_description,
          created_at: snapshot.created_at.toISOString(),
          snapshot_reason: snapshot.snapshot_reason,
          administrator_id:
            snapshot.economic_board_administrator_id === null
              ? null
              : snapshot.economic_board_administrator_id,
        }) satisfies IEconomicBoardSectionSnapshot.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEconomicBoardSectionSnapshot.ISummary;
}
