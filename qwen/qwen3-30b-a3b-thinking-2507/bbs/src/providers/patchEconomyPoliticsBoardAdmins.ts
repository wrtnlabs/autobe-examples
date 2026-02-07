import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe"

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IPageIEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomyPoliticsBoardAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { EconomyPoliticsBoardAdminAtSummaryTransformer } from "../transformers/EconomyPoliticsBoardAdminAtSummaryTransformer"

export async function patchEconomyPoliticsBoardAdmins(props: {
    body: IEconomyPoliticsBoardAdmin.IRequest;
}): Promise<IPageIEconomyPoliticsBoardAdmin.ISummary> {
    const page = 1;
    const limit = 100;
    const whereInput = {
        deleted_at: null,
        as, Prisma, : .economy_politics_board_adminsWhereInput,
        const: data = await MyGlobal.prisma.economy_politics_board_admins.findMany({
            where: whereInput,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { created_at: "desc" },
            ...EconomyPoliticsBoardAdminAtSummaryTransformer.select(),
        }),
        const: transformedData = await ArrayUtil.asyncMap(data, EconomyPoliticsBoardAdminAtSummaryTransformer.transform),
        const: total = await MyGlobal.prisma.economy_politics_board_admins.count({
            where: whereInput,
        }),
        if(total) { }
    } === 0, { return: { data: [], pagination: { current: page, limit: limit, records: , 0: , pages: , 0: , }, } };
}
return {
    data: transformedData,
    pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
    },
};
