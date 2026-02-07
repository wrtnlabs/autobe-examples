import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicFeatureFlag";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSystematicFeatureFlagCollector {
  export async function collect(props: {
    body: IShoppingMallSystematicFeatureFlag.ICreate;
  }) {
    return {
      id: v4(),
      feature_name: "",
      description: "",
      is_enabled: false,
      target_actor: "all",
      rollout_percentage: 0,
      expires_at: null,
    } satisfies Prisma.shopping_mall_systematic_feature_flagsCreateInput;
  }
}
