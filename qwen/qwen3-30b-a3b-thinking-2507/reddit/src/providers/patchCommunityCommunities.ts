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
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { CommunityCommunityAtSummaryTransformer } from "../transformers/CommunityCommunityAtSummaryTransformer"

export async function patchCommunityCommunities(props: {
    body: ICommunityCommunity.IRequest;
}): Promise<IPageICommunityCommunity.ISummary> {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 100;
    const skip = (page - 1) * limit;
    const where = {
        deleted_at: null,
        ...(props.body.search && { name: { contains: props.body.search },
            satisfies, Prisma, : .community_communitiesWhereInput,
            const: data = await MyGlobal.prisma.community_communities.findMany({
                where,
                skip,
                take: limit,
                orderBy: { created_at: 'desc' },
                select: CommunityCommunityAtSummaryTransformer.select()
            }),
            const: total = await MyGlobal.prisma.community_communities.count({
                where,
            }),
            const: transformedData = await ArrayUtil.asyncMap(data, CommunityCommunityAtSummaryTransformer.transform),
            return: {
                data: transformedData,
                pagination: {
                    current: page,
                    limit: limit,
                    records: total,
                    pages: Math.ceil(total / limit),
                    satisfies, IPage, : .IPagination,
                }
            } })
    };
}
