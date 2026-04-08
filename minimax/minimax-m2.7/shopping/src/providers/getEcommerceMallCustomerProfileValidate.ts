import { IEcommerceMallCustomerProfileValidateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfileValidateResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerProfileValidate(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallCustomerProfileValidateResult> {
  const errors: IEcommerceMallCustomerProfileValidateResult.IError[] = [];
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: {
      id: true,
      deleted_at: true,
      profile: {
        select: {
          id: true,
          display_name: true,
          phone: true,
        },
      },
    },
  });
  if (customer === null) {
    errors.push({
      field: "display_name",
      message: "Customer account not found",
    });
    return { errors, valid: false };
  }
  if (customer.deleted_at !== null) {
    errors.push({
      field: "display_name",
      message: "Customer account has been deleted",
    });
    return { errors, valid: false };
  }
  const profile = customer.profile;
  if (profile === null) {
    errors.push({
      field: "display_name",
      message: "Display name is required",
    });
    return { errors, valid: false };
  }
  const displayName = profile.display_name;
  const trimmedDisplayName = displayName.trim();
  if (trimmedDisplayName.length === 0) {
    errors.push({
      field: "display_name",
      message: "Display name is required and cannot be empty",
    });
  } else if (trimmedDisplayName.length > 100) {
    errors.push({
      field: "display_name",
      message: "Display name must not exceed 100 characters",
    });
  }
  const phone = profile.phone;
  if (phone !== null && phone !== undefined) {
    const phoneRegex = /^[0-9\s\-\+\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      errors.push({
        field: "phone",
        message:
          "Phone number can only contain digits, spaces, dashes, plus signs, and parentheses",
      });
    } else if (phone.length < 10 || phone.length > 20) {
      errors.push({
        field: "phone",
        message: "Phone number must be between 10 and 20 characters",
      });
    }
  }
  return {
    errors,
    valid: errors.length === 0,
  };
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
// import { IEcommerceMallCustomerProfileValidateResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfileValidateResult";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerProfileValidate(props: {
//   customer: CustomerPayload;
// }): Promise<IEcommerceMallCustomerProfileValidateResult> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------