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
    const now: Date = new Date();
    const existing =
      await MyGlobal.prisma.shopping_mall_member_email_verifications.findUniqueOrThrow(
        {
          where: { token: props.body.token },
          select: { shopping_mall_member_id: true },
        },
      );
    return {
      id: v4(),
      token: props.body.token,
      expires_at: now,
      used_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: { connect: { id: existing.shopping_mall_member_id } },
    } satisfies Prisma.shopping_mall_member_email_verificationsCreateInput;
  }
}
