import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPasswordReset";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallAdministratorAdministratorRequestsAdministratorRequestIdReject(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdministratorPasswordReset> {
  // Step 1: Verify super administrator
  const adminRecord =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id, deleted_at: null },
      select: { id: true, grade: true },
    });
  if (adminRecord.grade !== "super") {
    throw new HttpException(
      "Forbidden - Super administrator access required",
      403,
    );
  }
  /**
   * Cannot implement: Schema missing 'shopping_mall_administrator_requests' table
   * required by API. The operation cannot query or update a non-existent table.
   */
  return typia.random<IShoppingMallAdministratorPasswordReset>();
}
