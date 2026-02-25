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
import { IEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshot";
import { IPageIEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { SellerPayload } from "../decorators/payload/SellerPayload"
import { EcommerceOrderAtSummaryTransformer } from "../transformers/EcommerceOrderAtSummaryTransformer"

export async function patchEcommerceSellerOrdersIdSnapshots(props: {
    seller: SellerPayload;
    id: string & tags.Format<"uuid">;
    body: IEcommerceOrderSnapshot.IRequest;
}): Promise<IPageIEcommerceOrderSnapshot.ISummary> {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 10;
    const skip = (page - 1) * limit;
    const snapshots = await MyGlobal.prisma.ecommerce_order_snapshots.findMany({
        where: { ecommerce_order_id: props.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            created_at: true,
            order: {
                select: EcommerceOrderAtSummaryTransformer.select(),
            },
        },
    });
    const total = await MyGlobal.prisma.ecommerce_order_snapshots.count({
        where: { ecommerce_order_id: props.id },
    });
    const summarySnapshots = await ArrayUtil.asyncMap(snapshots, async (snapshot) => {
        return {
            id: snapshot.id,
            order: await EcommerceOrderAtSummaryTransformer.transform(snapshot.order),
        };
    });
    return {
        data: summarySnapshots,
        pagination: {
            current: page,
            limit: limit,
            records: total,
            pages: Math.ceil(total / limit),
        },
        satisfies, IPageIEcommerceOrderSnapshot, : .ISummary
    };
}
