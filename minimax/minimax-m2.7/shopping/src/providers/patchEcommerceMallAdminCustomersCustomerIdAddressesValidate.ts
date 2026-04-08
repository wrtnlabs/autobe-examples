import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCustomersCustomerIdAddressesValidate(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  body: IEcommerceMallShippingAddress.IRequest;
}): Promise<IEcommerceMallShippingAddress.IValidation> {
  const errorList: IEcommerceMallShippingAddress.IFieldError[] = [];
  // Validate recipientName: Required, non-empty string
  if (
    props.body.recipientName === undefined ||
    props.body.recipientName.trim().length === 0
  ) {
    errorList.push({
      field: "recipientName",
      message: "Recipient name is required",
    });
  } else if (props.body.recipientName.length > 100) {
    errorList.push({
      field: "recipientName",
      message: "Recipient name must not exceed 100 characters",
    });
  }
  // Validate phone: Required, valid phone format (10-20 characters)
  if (props.body.phone === undefined || props.body.phone.trim().length === 0) {
    errorList.push({
      field: "phone",
      message: "Phone number is required",
    });
  } else if (props.body.phone.length < 10) {
    errorList.push({
      field: "phone",
      message: "Phone number must be at least 10 characters",
    });
  } else if (props.body.phone.length > 20) {
    errorList.push({
      field: "phone",
      message: "Phone number must not exceed 20 characters",
    });
  }
  // Validate streetAddress: Required, non-empty string
  if (
    props.body.streetAddress === undefined ||
    props.body.streetAddress.trim().length === 0
  ) {
    errorList.push({
      field: "streetAddress",
      message: "Street address is required",
    });
  } else if (props.body.streetAddress.length > 500) {
    errorList.push({
      field: "streetAddress",
      message: "Street address must not exceed 500 characters",
    });
  }
  // Validate city: Required, non-empty string
  if (props.body.city === undefined || props.body.city.trim().length === 0) {
    errorList.push({
      field: "city",
      message: "City is required",
    });
  } else if (props.body.city.length > 100) {
    errorList.push({
      field: "city",
      message: "City must not exceed 100 characters",
    });
  }
  // Validate state: Required, non-empty string
  if (props.body.state === undefined || props.body.state.trim().length === 0) {
    errorList.push({
      field: "state",
      message: "State is required",
    });
  } else if (props.body.state.length > 100) {
    errorList.push({
      field: "state",
      message: "State must not exceed 100 characters",
    });
  }
  // Validate postalCode: Required, non-empty string
  if (
    props.body.postalCode === undefined ||
    props.body.postalCode.trim().length === 0
  ) {
    errorList.push({
      field: "postalCode",
      message: "Postal code is required",
    });
  }
  // Validate country: Required, non-empty string
  if (
    props.body.country === undefined ||
    props.body.country.trim().length === 0
  ) {
    errorList.push({
      field: "country",
      message: "Country is required",
    });
  }
  return {
    isValid: errorList.length === 0,
    errors: errorList,
  } satisfies IEcommerceMallShippingAddress.IValidation;
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
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdminCustomersCustomerIdAddressesValidate(props: {
//   admin: AdminPayload;
//   customerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallShippingAddress.IRequest;
// }): Promise<IEcommerceMallShippingAddress.IValidation> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------