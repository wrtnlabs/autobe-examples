import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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

export async function patchEcommerceMallCustomerAddressesValidate(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShippingAddress.IRequest;
}): Promise<IEcommerceMallShippingAddress.IValidationResult> {
  const validateRecipientName = (
    value: string | null | undefined,
  ): IEcommerceMallShippingAddress.IField => {
    if (value === undefined || value === null || value.length === 0) {
      return { isValid: false, error: "Recipient name is required" };
    }
    if (value.length > 100) {
      return {
        isValid: false,
        error: "Recipient name must not exceed 100 characters",
      };
    }
    return { isValid: true };
  };
  const validatePhone = (
    value: string | null | undefined,
  ): IEcommerceMallShippingAddress.IField => {
    if (value === undefined || value === null || value.length === 0) {
      return { isValid: false, error: "Phone number is required" };
    }
    const numericOnly = /^\d+$/;
    if (!numericOnly.test(value)) {
      return {
        isValid: false,
        error: "Phone number must contain only numeric characters",
      };
    }
    if (value.length < 10 || value.length > 20) {
      return {
        isValid: false,
        error: "Phone number must be between 10 and 20 characters",
      };
    }
    return { isValid: true };
  };
  const validateStreetAddress = (
    value: string | null | undefined,
  ): IEcommerceMallShippingAddress.IField => {
    if (value === undefined || value === null || value.length === 0) {
      return { isValid: false, error: "Street address is required" };
    }
    if (value.length > 500) {
      return {
        isValid: false,
        error: "Street address must not exceed 500 characters",
      };
    }
    return { isValid: true };
  };
  const validateCity = (
    value: string | null | undefined,
  ): IEcommerceMallShippingAddress.IField => {
    if (value === undefined || value === null || value.length === 0) {
      return { isValid: false, error: "City is required" };
    }
    if (value.length > 100) {
      return {
        isValid: false,
        error: "City must not exceed 100 characters",
      };
    }
    return { isValid: true };
  };
  const validateState = (
    value: string | null | undefined,
  ): IEcommerceMallShippingAddress.IField => {
    if (value === undefined || value === null || value.length === 0) {
      return { isValid: false, error: "State is required" };
    }
    if (value.length > 100) {
      return {
        isValid: false,
        error: "State must not exceed 100 characters",
      };
    }
    return { isValid: true };
  };
  const validatePostalCode = (
    value: string | null | undefined,
  ): IEcommerceMallShippingAddress.IField => {
    if (value === undefined || value === null || value.length === 0) {
      return { isValid: false, error: "Postal code is required" };
    }
    return { isValid: true };
  };
  const validateCountry = (
    value: string | null | undefined,
  ): IEcommerceMallShippingAddress.IField => {
    if (value === undefined || value === null || value.length === 0) {
      return { isValid: false, error: "Country is required" };
    }
    return { isValid: true };
  };
  const recipientNameResult = validateRecipientName(props.body.recipientName);
  const phoneResult = validatePhone(props.body.phone);
  const streetAddressResult = validateStreetAddress(props.body.streetAddress);
  const cityResult = validateCity(props.body.city);
  const stateResult = validateState(props.body.state);
  const postalCodeResult = validatePostalCode(props.body.postalCode);
  const countryResult = validateCountry(props.body.country);
  const isValid =
    recipientNameResult.isValid &&
    phoneResult.isValid &&
    streetAddressResult.isValid &&
    cityResult.isValid &&
    stateResult.isValid &&
    postalCodeResult.isValid &&
    countryResult.isValid;
  return {
    recipientName: recipientNameResult,
    phone: phoneResult,
    streetAddress: streetAddressResult,
    city: cityResult,
    state: stateResult,
    postalCode: postalCodeResult,
    country: countryResult,
    isValid: isValid,
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
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerAddressesValidate(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallShippingAddress.IRequest;
// }): Promise<IEcommerceMallShippingAddress.IValidationResult> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------