import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallMemberEmailVerificationCollector {
  export async function collect(props: {
    body: IShoppingMallMemberEmailVerification.ICreate;
  }) {
    return {
      id: v4(),
      token: props.body.token,
      expires_at: (MyGlobal as any).toISOStringSafe(
        (props.body as any).expires_at ?? null,
      ) as any,
      used_at: null,
      created_at: (MyGlobal as any).toISOStringSafe(new Date()) as any,
      updated_at: (MyGlobal as any).toISOStringSafe(new Date()) as any,
      deleted_at: null,
      member: {
        connect: {
          id: (props.body as any).member_id,
        },
      },
    } satisfies Prisma.shopping_mall_member_email_verificationsCreateInput;
  }
}
