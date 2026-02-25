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
import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IPageIEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { EcommerceProductSnapshotTransformer } from "../transformers/EcommerceProductSnapshotTransformer"

export async function patchEcommerceProductsProductIdSnapshots(props: {
    productId: string & tags.Format<"uuid">;
    body: IEcommerceProductSnapshot.IRequest;
}): Promise<IPageIEcommerceProductSnapshot.ISummary> {
    const page = props.body.page ?? 1;
    const limit = props.body.limit ?? 100;
    const skip = (page - 1) * limit;
    const whereInput: Prisma.ecommerce_product_snapshotsWhereInput = {
        ecommerce_product_id: props.productId,
    };
    if (props.body.startDate) {
        whereInput.created_at = {
            gte: props.body.startDate,
            if(props) { }, : .body.endDate
        };
        {
            whereInput.created_at = {
                ...whereInput.created_at,
                lte: props.body.endDate,
            };
        }
        const snapshots = await MyGlobal.prisma.ecommerce_product_snapshots.findMany({
            where: whereInput,
            skip,
            take: limit,
            orderBy: { created_at: "desc" as const },
        });
        const total = await MyGlobal.prisma.ecommerce_product_snapshots.count({
            where: whereInput,
        });
        return {
            data: await ArrayUtil.asyncMap(snapshots, (item) => EcommerceProductSnapshotTransformer.transform(item) as IEcommerceProductSnapshot.ISummary),
            pagination: {
                current: page,
                limit,
                records: total,
                pages: Math.ceil(total / limit),
            },
        };
    }
}
