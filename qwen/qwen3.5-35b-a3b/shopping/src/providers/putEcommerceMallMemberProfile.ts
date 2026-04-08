import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallMemberTransformer } from "../transformers/EcommerceMallMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallMemberProfile(props: {
  member: MemberPayload;
  body: IEcommerceMallMember.IUpdate;
}): Promise<IEcommerceMallMember> {
  // Validate display_name if provided
  if (props.body.display_name !== undefined) {
    const displayName = props.body.display_name;
    if (displayName !== null) {
      if (displayName.trim().length === 0) {
        throw new HttpException("Display name cannot be empty", 400);
      }
      if (!/^[A-Za-z0-9\s\-'\.+]+$/u.test(displayName)) {
        throw new HttpException(
          "Display name contains prohibited characters",
          400,
        );
      }
    }
  }
  // Validate phone_number if provided
  if (props.body.phone_number !== undefined) {
    if (props.body.phone_number !== null) {
      const phoneNumber = props.body.phone_number;
      if (!/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
        throw new HttpException(
          "Phone number must be in valid format with country code",
          400,
        );
      }
    }
  }
  // Fetch current member to capture old values for snapshot
  const currentMember =
    await MyGlobal.prisma.ecommerce_mall_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
      },
    });
  // Check if any fields are actually changing
  const hasChanges =
    props.body.display_name !== undefined ||
    props.body.phone_number !== undefined;
  // Prepare update data
  const updateData: {
    display_name?: string | null;
    phone_number?: string | null;
    updated_at: string & tags.Format<"date-time">;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.display_name !== undefined) {
    updateData.display_name = props.body.display_name;
  }
  if (props.body.phone_number !== undefined) {
    updateData.phone_number = props.body.phone_number;
  }
  // Update the member profile
  const updatedMember = await MyGlobal.prisma.ecommerce_mall_members.update({
    where: {
      id: props.member.id,
    },
    data: updateData,
  });
  // Create snapshot if changes occurred
  if (hasChanges) {
    const changedFields: Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];
    if (props.body.display_name !== undefined) {
      changedFields.push({
        field: "display_name",
        oldValue: currentMember.display_name,
        newValue: props.body.display_name,
      });
    }
    if (props.body.phone_number !== undefined) {
      changedFields.push({
        field: "phone_number",
        oldValue: currentMember.phone_number,
        newValue: props.body.phone_number,
      });
    }
    await MyGlobal.prisma.ecommerce_mall_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        entity_type: "MEMBER",
        entity_name: currentMember.display_name ?? "Unnamed Member",
        entity_status: "ACTIVE",
        action: "UPDATE",
        metadata: JSON.stringify({ changedFields }),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // Return updated profile using transformer
  const transformedMember =
    await MyGlobal.prisma.ecommerce_mall_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
      },
      ...EcommerceMallMemberTransformer.select(),
    });
  return await EcommerceMallMemberTransformer.transform(transformedMember);
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
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallMemberProfile(props: {
//   member: MemberPayload;
//   body: IEcommerceMallMember.IUpdate;
// }): Promise<IEcommerceMallMember> {
//   await MyGlobal.prisma.ecommerce_mall_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_members.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallMemberTransformer.select(),
//   });
//   return await EcommerceMallMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------