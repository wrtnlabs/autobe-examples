import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallChannelCollector {
  export async function collect(props: { body: IShoppingMallChannel.ICreate }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      logo_url: null,
      color_scheme: null,
      theme: null,
      timezone: "Asia/Seoul",
      currency: "KRW",
      language: "en-US",
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shopping_mall_sections: undefined,
    } satisfies Prisma.shopping_mall_channelsCreateInput;
  }
}
