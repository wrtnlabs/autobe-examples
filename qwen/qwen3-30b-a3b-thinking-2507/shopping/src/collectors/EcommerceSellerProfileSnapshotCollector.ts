import { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceSellerProfileSnapshotCollector {
  export async function collect(props: {
    body: IEcommerceSellerProfileSnapshot.ICreate;
    ecommerceSellers: IEntity;
  }) {
    const id = v4();
    return {
      id,
      shop_name_before: props.body.shop_name_before,
      description_before: props.body.description_before,
      logo_before: props.body.logo_before ?? null,
      shop_name_after: props.body.shop_name_after,
      description_after: props.body.description_after,
      logo_after: props.body.logo_after ?? null,
      created_at: new Date(),
      sellerProfile: {
        connect: { id: props.body.ecommerce_seller_profiles_id },
      },
      actor: { connect: { id: props.ecommerceSellers.id } },
    } satisfies Prisma.ecommerce_seller_profile_snapshotsCreateInput;
  }
}
