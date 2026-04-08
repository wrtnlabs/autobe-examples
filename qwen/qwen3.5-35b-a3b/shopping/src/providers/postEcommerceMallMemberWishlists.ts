import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallWishlistCollector } from "../collectors/EcommerceMallWishlistCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallWishlistTransformer } from "../transformers/EcommerceMallWishlistTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallMemberWishlists(props: {
  member: MemberPayload;
  body: IEcommerceMallWishlist.ICreate;
}): Promise<IEcommerceMallWishlist> {
  const member = await MyGlobal.prisma.ecommerce_mall_members.findUniqueOrThrow(
    {
      where: {
        id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        email: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const record = await MyGlobal.prisma.ecommerce_mall_wishlists.create({
    data: await EcommerceMallWishlistCollector.collect({
      body: props.body,
      ecommerceMallMembers: member,
    }),
    ...EcommerceMallWishlistTransformer.select(),
  });
  return await EcommerceMallWishlistTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallMemberWishlists(props: {
//   member: MemberPayload;
//   body: IEcommerceMallWishlist.ICreate;
// }): Promise<IEcommerceMallWishlist> {
//   const record = await MyGlobal.prisma.ecommerce_mall_wishlists.create({
//     data: await EcommerceMallWishlistCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallWishlistTransformer.select(),
//   });
//   return await EcommerceMallWishlistTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------